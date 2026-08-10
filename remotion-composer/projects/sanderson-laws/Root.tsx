import React from "react";
import { Composition } from "remotion";
import { VoxFull, VOX_FULL_DURATION } from "./VoxScenes";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="SandersonFull"
        component={VoxFull}
        durationInFrames={Math.round(VOX_FULL_DURATION * 30)}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{ narration: true }}
      />
    </>
  );
};
