export default function Plugin({ name, version }) {
  return (
    <div className="flex justify-between p-3 border border-gray-200 rounded">
      <span>{name}</span>
      <span>Version: {version}</span>
      <span className="text-white rounded smp py-1 px-2 shadow-sm bg-red-800">
        Delete
      </span>
    </div>
  );
}
