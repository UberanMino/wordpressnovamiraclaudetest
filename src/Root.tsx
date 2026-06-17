import { Composition } from "remotion";
import { Kaleidoscope } from "./Kaleidoscope";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Kaleidoscope"
      component={Kaleidoscope}
      durationInFrames={300}
      fps={30}
      width={1080}
      height={1080}
    />
  );
};
