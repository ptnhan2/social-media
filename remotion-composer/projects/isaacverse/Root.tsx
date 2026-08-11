import React from "react";
import { Composition, Sequence, staticFile } from "remotion";
import { AudienceDemandProof, CandidateComparison, ChapterCard, CinematicMetaphor, HostReflectionShot, ProcessTimeline, ScreenProofInWorld, SemanticDiagram } from "../../shared/isaacverse/treatments";
import { IsaacVerseEditVideo } from "../../shared/isaacverse/EditVideo";
import type { IsaacVerseEditDoc } from "../../shared/isaacverse/types";

const diagram = () => (
  <SemanticDiagram
    title="The journey"
    kicker="story structure"
    centerLabel="the viewer"
    nodes={[
      { id: "status", label: "Status quo", detail: "where the viewer starts", x: 50, y: 18, activeFrom: 0.6 },
      { id: "call", label: "Call", detail: "the question appears", x: 78, y: 34, activeFrom: 1.3, color: "#61d7e8" },
      { id: "trials", label: "Trials", detail: "friction and attempts", x: 78, y: 70, activeFrom: 2.0 },
      { id: "crisis", label: "Crisis", detail: "the lowest point", x: 50, y: 86, activeFrom: 2.8, color: "#ec6a5e" },
      { id: "treasure", label: "Treasure", detail: "the new idea", x: 22, y: 70, activeFrom: 3.6, color: "#61d7e8" },
      { id: "return", label: "Return", detail: "bring it back", x: 22, y: 34, activeFrom: 4.4 },
    ]}
    edges={[
      { from: "status", to: "call", revealAt: 1.0 },
      { from: "call", to: "trials", revealAt: 1.7 },
      { from: "trials", to: "crisis", revealAt: 2.5, color: "rgba(236,106,94,0.72)" },
      { from: "crisis", to: "treasure", revealAt: 3.3, color: "rgba(97,215,232,0.72)" },
      { from: "treasure", to: "return", revealAt: 4.1 },
      { from: "return", to: "status", revealAt: 4.9 },
    ]}
  />
);

const fixture = () => (
  <>
    <Sequence from={0} durationInFrames={240}>{diagram()}</Sequence>
    <Sequence from={240} durationInFrames={120}>
      <ChapterCard title="The turn" subtitle="the story changes" holdFrom={0} />
    </Sequence>
  </>
);

const assetFixture = () => (
  <>
    <Sequence from={0} durationInFrames={180}>
      <ScreenProofInWorld
        screenSrc={staticFile("isaacverse-fixtures/screen-proof-clean.jpg")}
        hostSrc={staticFile("isaacverse-fixtures/host-reflection-clean.jpg")}
        caption="make the evidence part of the scene"
      />
    </Sequence>
    <Sequence from={180} durationInFrames={180}>
      <HostReflectionShot src={staticFile("isaacverse-fixtures/host-reflection-clean.jpg")} subtitle="the process is the story" />
    </Sequence>
  </>
);

const audienceProof = () => (
  <AudienceDemandProof
    comments={[
      { text: "Where's the editing tutorial?", delay: 0.25, x: 48, y: 25, rotation: -1.5, color: "#61d7e8" },
      { text: "How do you edit your videos?", delay: 0.75, x: 56, y: 43, rotation: 1.4, color: "#f2b84b" },
      { text: "You edit so good.", delay: 1.25, x: 42, y: 60, rotation: -0.8, color: "#ec6a5e" },
    ]}
    contextSrc={staticFile("isaacverse-fixtures/screen-proof-clean.jpg")}
    hostSrc={staticFile("isaacverse-fixtures/host-reflection-clean.jpg")}
    caption="the audience was already asking"
  />
);

const processTimeline = () => (
  <ProcessTimeline
    title="Build the edit"
    activeStep={2}
    steps={[
      { label: "VO", detail: "cut the pauses", color: "#61d7e8" },
      { label: "Music", detail: "find the pulse", color: "#f2b84b" },
      { label: "Visuals", detail: "layer the evidence", color: "#ec6a5e" },
      { label: "Animation", detail: "time the reveal", color: "#a98bff" },
      { label: "Sound", detail: "make it felt", color: "#61d7e8" },
    ]}
  />
);

const candidateComparison = () => (
  <CandidateComparison
    title="Choose the take"
    criteria="Which version keeps the human rhythm?"
    selectedIndex={1}
    candidates={[
      { label: "Take one", detail: "clean, but flat", src: staticFile("isaacverse-fixtures/screen-proof-clean.jpg"), color: "#ec6a5e" },
      { label: "Take two", detail: "slightly imperfect, more alive", src: staticFile("isaacverse-fixtures/host-reflection-clean.jpg"), color: "#f2b84b" },
      { label: "Take three", detail: "too controlled", src: staticFile("isaacverse-fixtures/screen-proof-clean.jpg"), color: "#61d7e8" },
    ]}
  />
);

const cinematicMetaphor = () => (
  <CinematicMetaphor
    src={staticFile("isaacverse-fixtures/host-reflection-clean.jpg")}
    label="the invisible problem"
    subtitle="make the technical idea feel human"
    mode="warm"
  />
);

const editDoc: IsaacVerseEditDoc = {
  id: "isaacverse-edit-fixture",
  width: 1920,
  height: 1080,
  fps: 30,
  beats: [
    {
      id: "beat-demand",
      journeySlot: "call",
      startSec: 0,
      durationSec: 4,
      transcript: "Where's the editing tutorial?",
      narrativeFunction: "audience demand",
      treatment: {
        id: "audience-demand-proof",
        params: {
          comments: [
            { text: "Where's the editing tutorial?", delay: 0.2, x: 48, y: 25, rotation: -1.5, color: "#61d7e8" },
            { text: "How do you edit your videos?", delay: 0.7, x: 55, y: 43, rotation: 1.4, color: "#f2b84b" },
            { text: "You edit so good.", delay: 1.2, x: 42, y: 60, rotation: -0.8, color: "#ec6a5e" },
          ],
          caption: "the audience was already asking",
        },
        assets: [
          { id: "screen-proof", kind: "screen", src: staticFile("isaacverse-fixtures/screen-proof-clean.jpg") },
          { id: "host", kind: "character", src: staticFile("isaacverse-fixtures/host-reflection-clean.jpg") },
        ],
      },
      audioCues: [],
    },
    {
      id: "beat-proof",
      journeySlot: "trials",
      startSec: 4,
      durationSec: 3,
      transcript: "This is the editing tutorial.",
      narrativeFunction: "process proof",
      treatment: {
        id: "screen-proof-in-world",
        params: { caption: "the process becomes the scene", focusRect: { x: 18, y: 20, w: 55, h: 30 } },
        assets: [
          { id: "screen-proof", kind: "screen", src: staticFile("isaacverse-fixtures/screen-proof-clean.jpg") },
          { id: "host", kind: "character", src: staticFile("isaacverse-fixtures/host-reflection-clean.jpg") },
        ],
      },
      audioCues: [],
    },
    {
      id: "beat-reflection",
      journeySlot: "crisis",
      startSec: 7,
      durationSec: 3,
      transcript: "You don't need to be an editing wizard.",
      narrativeFunction: "identity reassurance",
      treatment: {
        id: "host-reflection-cinematic",
        params: { subtitle: "you don't need to be an editing wizard", lightSide: "left" },
        assets: [{ id: "host", kind: "character", src: staticFile("isaacverse-fixtures/host-reflection-clean.jpg") }],
      },
      audioCues: [],
    },
    {
      id: "beat-diagram",
      journeySlot: "reward",
      startSec: 10,
      durationSec: 4,
      transcript: "Sketch, create, animate.",
      narrativeFunction: "process structure",
      treatment: {
        id: "semantic-diagram",
        params: {
          title: "Sketch, create, animate",
          kicker: "the process",
          centerLabel: "the edit",
          nodes: [
            { id: "sketch", label: "Sketch", detail: "imagine the shot", x: 24, y: 50, activeFrom: 0.2, color: "#61d7e8" },
            { id: "create", label: "Create", detail: "build the visual", x: 50, y: 50, activeFrom: 0.8, color: "#f2b84b" },
            { id: "animate", label: "Animate", detail: "time it to voice", x: 76, y: 50, activeFrom: 1.4, color: "#ec6a5e" },
          ],
          edges: [
            { from: "sketch", to: "create", revealAt: 0.6 },
            { from: "create", to: "animate", revealAt: 1.2 },
          ],
        },
        assets: [],
      },
      audioCues: [],
    },
  ],
  audioPlan: {
    voice: [
      {
        id: "voice-fixture",
        src: staticFile("isaacverse-fixtures/audio/reference-voice-enhanced-03.mp3"),
        startSec: 0,
        endSec: 4,
        transcript: "Where's the editing tutorial?",
      },
    ],
    music: [
      {
        id: "music-fixture",
        src: staticFile("isaacverse-fixtures/audio/fixture-music-bed.mp3"),
        startSec: 0,
        endSec: 14,
        gainDb: -18,
        density: "normal",
      },
    ],
    ambience: [],
    beats: [
      {
        beatId: "beat-demand",
        density: "dense",
        sfx: [],
        preservePauses: true,
        duckZones: [{ startSec: 0, endSec: 4, bus: "music", gainDb: -10, attackSec: 0.08, releaseSec: 0.28 }],
      },
      {
        beatId: "beat-proof",
        density: "normal",
        sfx: [{ id: "whoosh-proof", src: staticFile("isaacverse-fixtures/audio/reference-whoosh.mp3"), atSec: 4, durationSec: 0.6, gainDb: -9, reason: "transition" }],
        preservePauses: true,
        duckZones: [],
      },
      {
        beatId: "beat-reflection",
        density: "sparse",
        sfx: [{ id: "impact-reflection", src: staticFile("isaacverse-fixtures/audio/reference-impact.mp3"), atSec: 7.4, durationSec: 0.55, gainDb: -12, reason: "emphasis" }],
        preservePauses: true,
        duckZones: [{ startSec: 7, endSec: 10, bus: "music", gainDb: -13, attackSec: 0.12, releaseSec: 0.4 }],
      },
      { beatId: "beat-diagram", density: "normal", sfx: [], preservePauses: true, duckZones: [] },
    ],
    master: { targetLufs: -16, maxTruePeakDbfs: -1, limiter: true },
  },
  transitions: [
    { id: "transition-proof", atSec: 4, durationSec: 0.45, type: "flash", accent: "#f2b84b" },
    { id: "transition-reflection", atSec: 7, durationSec: 0.55, type: "light-leak", accent: "#61d7e8" },
    { id: "transition-diagram", atSec: 10, durationSec: 0.45, type: "blur", accent: "#a98bff" }
  ],
  colorGrade: { preset: "cinematic", intensity: 0.32 },
};

const pilotDoc: IsaacVerseEditDoc = {
  ...editDoc,
  id: "isaacverse-30s-pilot",
  beats: [
    ...editDoc.beats,
    {
      id: "beat-candidates",
      journeySlot: "trials",
      startSec: 14,
      durationSec: 5,
      transcript: "Which version keeps the human rhythm?",
      narrativeFunction: "compare candidates",
      treatment: {
        id: "candidate-comparison",
        params: {
          title: "Choose the take",
          criteria: "Which version keeps the human rhythm?",
          selectedIndex: 1,
          candidates: [
            { label: "Take one", detail: "clean, but flat", src: staticFile("isaacverse-fixtures/screen-proof-clean.jpg"), color: "#ec6a5e" },
            { label: "Take two", detail: "slightly imperfect, more alive", src: staticFile("isaacverse-fixtures/host-reflection-clean.jpg"), color: "#f2b84b" },
            { label: "Take three", detail: "too controlled", src: staticFile("isaacverse-fixtures/screen-proof-clean.jpg"), color: "#61d7e8" }
          ]
        },
        assets: []
      },
      audioCues: []
    },
    {
      id: "beat-process",
      journeySlot: "result",
      startSec: 19,
      durationSec: 5,
      transcript: "VO, music, visuals, animation, sound.",
      narrativeFunction: "make the workflow visible",
      treatment: {
        id: "process-timeline",
        params: {
          title: "Build the edit",
          activeStep: 2,
          steps: [
            { label: "VO", detail: "cut the pauses", color: "#61d7e8" },
            { label: "Music", detail: "find the pulse", color: "#f2b84b" },
            { label: "Visuals", detail: "layer the evidence", color: "#ec6a5e" },
            { label: "Animation", detail: "time the reveal", color: "#a98bff" },
            { label: "Sound", detail: "make it felt", color: "#61d7e8" }
          ]
        },
        assets: []
      },
      audioCues: []
    },
    {
      id: "beat-metaphor",
      journeySlot: "reward",
      startSec: 24,
      durationSec: 3,
      transcript: "Make the technical idea feel human.",
      narrativeFunction: "cinematic metaphor",
      treatment: {
        id: "cinematic-metaphor",
        params: { label: "the invisible problem", subtitle: "make the technical idea feel human", mode: "warm" },
        assets: [{ id: "metaphor", kind: "image", src: staticFile("isaacverse-fixtures/host-reflection-clean.jpg") }]
      },
      audioCues: []
    },
    {
      id: "beat-close",
      journeySlot: "resolution",
      startSec: 27,
      durationSec: 3,
      transcript: "The process is the story.",
      narrativeFunction: "resolution",
      treatment: {
        id: "chapter-card",
        params: { title: "The process", subtitle: "is the story", accent: "#f2b84b" },
        assets: []
      },
      audioCues: []
    }
  ],
  audioPlan: {
    ...editDoc.audioPlan!,
    music: [{ ...editDoc.audioPlan!.music[0], src: staticFile("isaacverse-fixtures/audio/fixture-music-bed-30s.mp3"), endSec: 30 }],
    beats: [
      ...editDoc.audioPlan!.beats,
      { beatId: "beat-candidates", density: "normal", sfx: [], preservePauses: true, duckZones: [] },
      { beatId: "beat-process", density: "normal", sfx: [], preservePauses: true, duckZones: [] },
      { beatId: "beat-metaphor", density: "sparse", sfx: [], preservePauses: true, duckZones: [{ startSec: 24, endSec: 27, bus: "music", gainDb: -12, attackSec: 0.1, releaseSec: 0.35 }] },
      { beatId: "beat-close", density: "sparse", sfx: [], preservePauses: true, duckZones: [] }
    ]
  },
  transitions: [
    ...editDoc.transitions!,
    { id: "transition-candidates", atSec: 14, durationSec: 0.45, type: "flash", accent: "#f2b84b" },
    { id: "transition-process", atSec: 19, durationSec: 0.45, type: "light-leak", accent: "#61d7e8" },
    { id: "transition-metaphor", atSec: 24, durationSec: 0.45, type: "blur", accent: "#ec6a5e" },
    { id: "transition-close", atSec: 27, durationSec: 0.45, type: "flash", accent: "#f2b84b" }
  ]
};

const editDocFixture = () => <IsaacVerseEditVideo doc={editDoc} />;
const pilotDocFixture = () => <IsaacVerseEditVideo doc={pilotDoc} />;

const comp = (id: string, component: React.FC, durationInFrames: number) => (
  <Composition id={id} component={component} durationInFrames={durationInFrames} fps={30} width={1920} height={1080} />
);

export const Root: React.FC = () => (
  <>
    {comp("isaacverse-semantic-diagram", diagram, 240)}
    {comp("isaacverse-chapter-card", () => <ChapterCard title="The turn" subtitle="the story changes" />, 120)}
    {comp("isaacverse-treatment-fixture", fixture, 360)}
    {comp("isaacverse-asset-treatments", assetFixture, 360)}
    {comp("isaacverse-audience-demand-proof", audienceProof, 180)}
    {comp("isaacverse-edit-doc-fixture", editDocFixture, 420)}
    {comp("isaacverse-30s-pilot", pilotDocFixture, 900)}
    {comp("isaacverse-process-timeline", processTimeline, 180)}
    {comp("isaacverse-candidate-comparison", candidateComparison, 180)}
    {comp("isaacverse-cinematic-metaphor", cinematicMetaphor, 180)}
  </>
);
