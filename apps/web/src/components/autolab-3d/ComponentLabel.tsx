import SceneLabel from "./SceneLabel";
export default function ComponentLabel({
  name,
  status,
}: {
  name: string;
  status: string;
}) {
  return (
    <SceneLabel
      position={[0, 0.5, 0]}
      text={name}
      detail={status}
      className="twin-label"
    />
  );
}
