const admin = require('firebase-admin');
const prisma = require('../../config/database');
const { firebase, nodeEnv } = require('../../config');

const firebaseEnabled = nodeEnv === 'production' && firebase.projectId && firebase.projectId !== 'DEV_SKIP';

if (firebaseEnabled && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: firebase.projectId,
      privateKey: firebase.privateKey,
      clientEmail: firebase.clientEmail,
    }),
  });
}

const send = async ({ userId, customerId, workshopId, type, title, body, data = {} }) => {
  const notification = await prisma.notification.create({
    data: { userId, customerId, workshopId, type, title, body, data },
  });

  let fcmToken = null;
  if (userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { fcmToken: true } });
    fcmToken = user?.fcmToken;
  }

  if (fcmToken && firebaseEnabled) {
    try {
      await admin.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data: { notificationId: notification.id, type, ...data },
      });
      await prisma.notification.update({ where: { id: notification.id }, data: { sentAt: new Date() } });
    } catch (e) {
      console.error('[FCM] Error enviando notificación:', e.message);
    }
  } else if (fcmToken && !firebaseEnabled) {
    console.log(`[DEV FCM] → ${title}: ${body}`);
  }

  return notification;
};

const sendStatusUpdate = (workOrder, userId) =>
  send({
    userId,
    workshopId: workOrder.workshopId,
    type: 'STATUS_UPDATE',
    title: 'Estado de tu vehículo actualizado',
    body: `Tu vehículo ahora está en estado: ${workOrder.status}`,
    data: { workOrderId: workOrder.id },
  });

module.exports = { send, sendStatusUpdate };
