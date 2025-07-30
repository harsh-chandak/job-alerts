import { useDrop } from 'react-dnd';

export default function MappingDropZone({ field, value, onDrop }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'jsonField',
    drop: (item) => {
      onDrop(field, item.path);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [field, onDrop]);

  return (
    <div
      ref={drop}
      style={{
        minHeight: 40,
        border: '2px dashed #ccc',
        borderColor: isOver && canDrop ? 'green' : '#ccc',
        padding: '8px 12px',
        borderRadius: 4,
        backgroundColor: isOver && canDrop ? '#e6ffed' : 'white',
        marginBottom: 8,
        userSelect: 'none',
      }}
    >
      <div className="font-semibold mb-1">{field}</div>
      <div style={{ fontSize: 12, color: '#444', wordBreak: 'break-all' }}>
        {value || <em>Drop a JSON field here</em>}
      </div>
    </div>
  );
}
