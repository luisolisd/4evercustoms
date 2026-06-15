import Button from './Button';
import { Plus } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-up">
      {Icon && (
        <div className="p-5 bg-gradient-to-br from-gray-50 to-gray-100 ring-1 ring-gray-100 rounded-3xl mb-4 shadow-soft">
          <Icon size={32} className="text-gray-400" />
        </div>
      )}
      <h3 className="font-display text-base font-bold text-gray-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-xs mb-6">{description}</p>}
      {action && (
        <Button icon={Plus} onClick={onAction}>{action}</Button>
      )}
    </div>
  );
}
