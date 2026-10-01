"use client";
import { useEffect, useRef } from "react";
import { boardMarkup } from "./boardMarkup";
import { initBoard } from "../lib/board";
import chart from "../data/chart.json";
import artists from "../data/artists.json";

export default function Board() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return; // React dev mode runs effects twice; draw the board once
    started.current = true;
    initBoard(chart, artists);
  }, []);
  return <div className="frame" dangerouslySetInnerHTML={{ __html: boardMarkup }} />;
}
