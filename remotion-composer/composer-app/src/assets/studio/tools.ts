import { ToolId } from "./types";

export interface ToolDef {
  id: ToolId;
  label: string;
  icon: string;
  shortcut: string;
  hint: string;
}

export const TOOLS: ToolDef[] = [
  { id: "move", label: "Move / Select", icon: "🖱", shortcut: "V", hint: "Chọn layer, kéo di chuyển, transform handles" },
  { id: "lasso", label: "Lasso cut", icon: "✂️", shortcut: "L", hint: "Click điểm vẽ polygon quanh phần muốn GIỮ, Enter khép, Apply cắt" },
  { id: "wand", label: "Magic wand", icon: "🪄", shortcut: "W", hint: "Click vùng màu → chọn vùng tương tự → Delete xoá" },
  { id: "eraser", label: "Eraser", icon: "🧽", shortcut: "E", hint: "Chà xoá trực tiếp trên layer đang chọn" },
  { id: "bgremove", label: "BG remove", icon: "✨", shortcut: "B", hint: "Tách nền layer đang chọn bằng AI (rembg)" },
  { id: "zoom", label: "Zoom", icon: "🔍", shortcut: "Z", hint: "Click zoom in, Alt+click zoom out, Alt+wheel bất cứ lúc nào" },
  { id: "hand", label: "Hand / Pan", icon: "✋", shortcut: "H", hint: "Kéo để pan viewport (hoặc giữ Space với tool bất kỳ)" },
];

export const TOOL_BY_ID: Record<ToolId, ToolDef> = Object.fromEntries(TOOLS.map((t) => [t.id, t])) as Record<ToolId, ToolDef>;
