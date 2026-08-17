import { BoardPieceVisual, CourtLines } from "@/components/coach/board-markers";
import { parseBoard } from "@/lib/board";

export function BoardPreview({ board, uid = "preview" }: { board: unknown; uid?: string }) {
  const parsed = parseBoard(board);

  return (
    <div
      className="relative mx-auto w-full max-w-[220px] overflow-hidden rounded-xl border border-[#7a451c]/40"
      style={{ aspectRatio: "9 / 14" }}
    >
      <CourtLines uid={uid} />
      {parsed.pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${piece.x * 100}%`, top: `${piece.y * 100}%` }}
        >
          <BoardPieceVisual piece={piece} compact />
        </div>
      ))}
    </div>
  );
}
