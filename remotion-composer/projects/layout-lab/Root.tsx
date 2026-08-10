import React from "react";
import { Composition } from "remotion";
import type { Scene } from "../../shared/types";

import { PhotoLeft } from "../../shared/layouts/photo-left";
import { FullBleed } from "../../shared/layouts/full-bleed";
import { Asymmetric6040 } from "../../shared/layouts/asymmetric-6040";
import { TextView } from "../../shared/layouts/center-stack";
import { ChipsView } from "../../shared/layouts/chips-vertical";
import { ChatView } from "../../shared/layouts/chat-window";
import { CollageView } from "../../shared/layouts/collage-pair";
import { CounterView } from "../../shared/layouts/counter-list";
import { IcebergView } from "../../shared/layouts/iceberg-reveal";
import { StatView } from "../../shared/layouts/stat-frame";
import { BubblesView } from "../../shared/layouts/bubbles-ab";
import { CtaView } from "../../shared/layouts/cta-end";
import { Grid2x2 } from "../../shared/layouts/grid-2x2";
import { HeroOnly } from "../../shared/layouts/hero-only";
import { NumberCallout } from "../../shared/layouts/number-callout";
import { ProcessFlow } from "../../shared/layouts/process-flow";
import { StackedCards } from "../../shared/layouts/stacked-cards";

const D = (o: Partial<Scene> & { items: any[] }): Scene => ({ start:0, end:6, kind:"", ...o } as Scene);

const C1 = () => <PhotoLeft s={D({kind:"photo-left",dark:false,img:["scene-4.png"],motion:"slideL",items:[{at:0.5,text:"MAGIC RUNS ON METALS",size:64,color:"#4FC3F7"}]})} />;
const C2 = () => <FullBleed s={D({kind:"full-bleed",dark:true,img:["scene-21.png"],items:[{at:0.5,text:"STORMLIGHT LEAKS",size:64,color:"#A8D8FF"}]})} />;
const C3 = () => <Asymmetric6040 s={D({kind:"asymmetric-6040",dark:false,img:["scene-17.png"],motion:"slideL",items:[{at:0.5,text:"AON DOR",size:72,color:"#E3B341"}]})} />;
const C4 = () => <TextView s={D({kind:"text",dark:false,items:[{at:0.5,text:"THE ICEBERG THEORY",size:88,color:"#C77F00"}]})} />;
const C5 = () => <ChipsView s={D({kind:"chips",dark:true,chips:["A","B","C"],items:[{at:0.5,text:"always explain",size:68,color:"#2E74B5"}]})} />;
const C6 = () => <ChatView s={D({kind:"chat",items:[{at:0.5,text:"i feel sad.",size:34,color:"#131313"},{at:2.5,text:"a wave of sadness",size:26,color:"#D64541",sub:"highlight"}]})} />;
const C7 = () => <CollageView s={D({kind:"collage",img:["scene-19.png","scene-20.png"],items:[{at:0.5,text:"two worlds",size:60,color:"#C77F00"}]})} />;
const C8 = () => <CounterView s={D({kind:"counter",dark:true,items:[{at:0.5,text:"1 never name",size:34,color:"#fff200"}]})} />;
const C9 = () => <IcebergView s={D({kind:"iceberg",img:["scene-29.png"],items:[{at:0.5,text:"one eighth above",size:68,color:"#C77F00"}]})} />;
const C10 = () => <StatView s={D({kind:"stat",img:["scene-5.png"],items:[{at:0.5,text:"narrative flattening",size:52,color:"#2E74B5"}]})} />;
const C11 = () => <BubblesView s={D({kind:"bubbles",dark:true,items:[{at:0.5,text:"says A",size:50,color:"#fff200"}]})} />;
const C12 = () => <CtaView s={D({kind:"cta",items:[{at:0.5,text:"building for novelists",size:64,color:"#C77F00"}]})} />;
const C13 = () => <Grid2x2 s={D({kind:"grid-2x2",dark:false,img:["scene-1.png","scene-5.png","scene-7.png","scene-12.png"],items:[{at:0.5,text:"FOUR METALS",size:52,color:"#4FC3F7"}]})} />;
const C14 = () => <HeroOnly s={D({kind:"hero-only",dark:true,img:["scene-21.png"],items:[]})} />;
const C15 = () => <NumberCallout s={D({kind:"number-callout",dark:true,items:[{at:0.3,text:"24%",size:200,color:"#A8D8FF"},{at:1.5,text:"of the story",size:36,color:"#B0BEC5"}]})} />;
const C16 = () => <ProcessFlow s={D({kind:"process-flow",dark:false,items:[{at:0.5,text:"fuel",size:22,color:"#D64541"},{at:1.5,text:"weakness",size:22,color:"#2E74B5"},{at:2.5,text:"skill",size:22,color:"#2E7D32"}]})} />;
const C17 = () => <StackedCards s={D({kind:"stacked-cards",dark:false,img:["scene-17.png","scene-18.png","scene-19.png"],items:[{at:2,text:"three systems",size:46,color:"#C77F00"}]})} />;

const comp = (id: string, C: React.FC) => <Composition id={`preview-${id}`} component={C} durationInFrames={90} fps={30} width={1920} height={1080} />;

export const Root: React.FC = () => (
  <>
    {comp("photo-left",C1)}{comp("full-bleed",C2)}{comp("asymmetric-6040",C3)}
    {comp("center-stack",C4)}{comp("chips-vertical",C5)}{comp("chat-window",C6)}
    {comp("collage-pair",C7)}{comp("counter-list",C8)}{comp("bottom-up-reveal",C9)}
    {comp("stat-frame",C10)}{comp("dual-bubble",C11)}{comp("cta-end",C12)}
    {comp("grid-2x2",C13)}{comp("hero-only",C14)}{comp("number-callout",C15)}
    {comp("process-flow",C16)}{comp("stacked-cards",C17)}
  </>
);
