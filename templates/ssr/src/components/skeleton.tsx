type SkeletonProps = {
  label: string;
  class?: string;
};

export function Skeleton(props: SkeletonProps) {
  return (
    <div
      class={`animate-pulse rounded-md border border-dashed border-zinc-300 bg-zinc-100 px-4 py-6 text-sm text-zinc-500 ${props.class ?? ''}`}
      role="status"
      aria-busy="true"
    >
      Loading {props.label}…
    </div>
  );
}
