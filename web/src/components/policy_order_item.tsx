import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export default function PolicyOrderItem({
  dndId,
  id,
  name,
}: {
  dndId: string;
  id: number;
  name: string;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id: dndId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {id} - {name}
    </div>
  );
}
