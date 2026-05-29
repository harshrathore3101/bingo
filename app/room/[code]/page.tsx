import RoomGame from "@/components/RoomGame";

// Dynamic route: /room/1234 → shared game for room "1234".
// The server component just forwards the room code to the client game.
export default function RoomPage({ params }: { params: { code: string } }) {
  return <RoomGame code={params.code} />;
}
