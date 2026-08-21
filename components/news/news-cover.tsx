"use client";

import { useRef, useState, type PointerEvent } from "react";
import { cn } from "@/lib/utils";
import {
  DEFAULT_COVER_FRAME,
  clampCoverFocus,
  coverImageStyle,
  type CoverFrame,
} from "@/lib/news";

export function NewsCover({
  url,
  frame,
  alt = "",
  className,
  interactive = false,
  onFrameChange,
}: {
  url?: string | null;
  frame?: CoverFrame | null;
  alt?: string;
  className?: string;
  interactive?: boolean;
  onFrameChange?: (frame: CoverFrame) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    fx: number;
    fy: number;
  } | null>(null);
  const [dragging, setDragging] = useState(false);
  const current = frame ?? DEFAULT_COVER_FRAME;
  const canDrag = Boolean(interactive && url && onFrameChange);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!canDrag || !onFrameChange) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      fx: current.x,
      fy: current.y,
    };
    setDragging(true);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current || dragRef.current.id !== event.pointerId || !onFrameChange) return;
    const box = boxRef.current?.getBoundingClientRect();
    if (!box?.width || !box.height) return;
    const dx = ((event.clientX - dragRef.current.x) / box.width) * 100;
    const dy = ((event.clientY - dragRef.current.y) / box.height) * 100;
    onFrameChange({
      ...current,
      x: clampCoverFocus(dragRef.current.fx - dx),
      y: clampCoverFocus(dragRef.current.fy - dy),
    });
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragRef.current?.id !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div
      ref={boxRef}
      className={cn(
        "relative overflow-hidden bg-primary",
        canDrag && (dragging ? "cursor-grabbing" : "cursor-grab"),
        className
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={canDrag ? { touchAction: "none" } : undefined}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          draggable={false}
          className="h-full w-full select-none"
          style={coverImageStyle(current)}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-accent/70" />
      )}
    </div>
  );
}
