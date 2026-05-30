import UnoRoom from "@/components/uno/UnoRoom";

// Dynamic UNO room route: /uno/1234
export default function UnoRoomPage({ params }: { params: { code: string } }) {
  return <UnoRoom code={params.code} />;
}
