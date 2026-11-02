import { Button, EmptyState } from '../../../components/ui';

export default function LoadError({ what, onRetry }) {
  return (
    <EmptyState boxed compact tone="error" title={`Couldn’t load ${what}`} action={<Button variant="primary" onClick={onRetry}>Retry</Button>}>
      Check your connection and try again.
    </EmptyState>
  );
}
