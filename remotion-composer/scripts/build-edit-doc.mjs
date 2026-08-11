import fs from "node:fs";
import path from "node:path";

const [, , slug = "isaacverse-final"] = process.argv;
const repoRoot = path.resolve(import.meta.dirname, "..", "..");
const projectDir = path.join(repoRoot, "projects", slug);
const publicDir = path.join(repoRoot, "remotion-composer", "public", slug);
const videoDocPath = path.join(projectDir, "04-video-doc.json");
const editDocPath = path.join(projectDir, "05-edit-doc.json");

const video = JSON.parse(fs.readFileSync(videoDocPath, "utf8"));
const beats = video.beats.map((beat) => ({ ...beat }));
const sceneMap = new Map();
const shots = [];
for (const beat of beats) {
  const endSec = beat.startSec + beat.durationSec;
  const scene = sceneMap.get(beat.sceneId || `scene-${beat.id}`) || { id: beat.sceneId || `scene-${beat.id}`, index: sceneMap.size + 1, startSec: beat.startSec, durationSec: 0, beatIds: [], shotIds: [] };
  scene.startSec = Math.min(scene.startSec, beat.startSec);
  scene.durationSec = Math.max(scene.durationSec, endSec - scene.startSec);
  scene.beatIds.push(beat.id);
  const shotId = beat.shotIds?.[0] || `${beat.id}:shot-01`;
  scene.shotIds.push(shotId);
  shots.push({ id: shotId, beatId: beat.id, startSec: beat.startSec, durationSec: beat.durationSec, purpose: beat.narrativeFunction, elementIds: (beat.elements || []).map((element) => element.id) });
  sceneMap.set(scene.id, scene);
}

const transitions = beats.slice(0, -1).map((beat, index) => ({
  id: `final-transition-${String(index + 1).padStart(2, "0")}`,
  atSec: beat.startSec + beat.durationSec,
  durationSec: beat.sceneId === beats[index + 1].sceneId ? 0.28 : 0.48,
  type: beat.sceneId === beats[index + 1].sceneId ? "fade" : index % 2 ? "light-leak" : "flash",
  accent: ["#61d7e8", "#f2b84b", "#ec6a5e", "#a98bff"][index % 4],
}));

const audioPlan = {
  voice: [{ id: `${slug}:voice`, src: `${slug}/audio/voice-bed.wav`, startSec: 0, endSec: 30, transcript: beats.map((beat) => beat.transcript).join(" ") }],
  music: [{ id: `${slug}:music`, src: `${slug}/audio/music-bed.wav`, startSec: 0, endSec: 30, gainDb: -20, bpm: 90, beatGrid: Array.from({ length: 46 }, (_, index) => Number((index * (60 / 90)).toFixed(4))), density: "normal" }],
  ambience: [],
  beats: beats.map((beat, index) => ({
    beatId: beat.id,
    density: index === 0 || index === beats.length - 1 ? "sparse" : "normal",
    sfx: index === 1 || index === 4 || index === 7 ? [{ id: `${beat.id}:cue`, src: `${slug}/audio/soft-hit.wav`, atSec: beat.startSec + 0.18, durationSec: 0.35, gainDb: -15, reason: index === 4 ? "reveal" : "emphasis" }] : [],
    duckZones: [{ startSec: beat.startSec, endSec: beat.startSec + beat.durationSec, bus: "music", gainDb: -10, attackSec: 0.08, releaseSec: 0.25 }],
    preservePauses: true,
  })),
  master: { targetLufs: -16, maxTruePeakDbfs: -1, limiter: true },
};

const edit = {
  id: `${slug}-edit`,
  videoId: slug,
  version: "v001",
  width: 1920,
  height: 1080,
  fps: 30,
  beats,
  assets: beats.flatMap((beat) => beat.treatment.assets),
  shots,
  scenes: [...sceneMap.values()],
  treatmentUsage: Object.fromEntries([...new Set(beats.map((beat) => beat.treatment.id))].map((treatmentId) => {
    const beatIds = beats.filter((beat) => beat.treatment.id === treatmentId).map((beat) => beat.id);
    return [treatmentId, { beatIds, count: beatIds.length }];
  })),
  audioPlan,
  transitions,
  colorGrade: { preset: "cinematic", intensity: 0.2 },
};

fs.mkdirSync(path.dirname(editDocPath), { recursive: true });
fs.mkdirSync(publicDir, { recursive: true });
const serialized = `${JSON.stringify(edit, null, 2)}\n`;
fs.writeFileSync(editDocPath, serialized, "utf8");
fs.writeFileSync(path.join(publicDir, "05-edit-doc.json"), serialized, "utf8");
console.log(JSON.stringify({ project: slug, editDoc: editDocPath, publicCopy: path.join(publicDir, "05-edit-doc.json"), beats: beats.length, scenes: sceneMap.size, durationSec: 30 }, null, 2));
