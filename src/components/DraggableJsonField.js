import { useDrag } from 'react-dnd';

export default function DraggableJsonField({ path, value }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'jsonField',
    item: { path },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [path]);

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'grab',
        padding: '4px 6px',
        borderBottom: '1px solid #ddd',
        fontSize: '12px',
        userSelect: 'none',
        backgroundColor: isDragging ? '#e0f2fe' : 'white',
      }}
      title={`${path}: ${JSON.stringify(value)}`}
    >
      <strong>{path}</strong>: {typeof value === 'string' && value.length > 30 ? `${value.slice(0, 30)}...` : JSON.stringify(value)}
    </div>
  );
}
