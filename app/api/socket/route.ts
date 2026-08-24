import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    message: "Socket.io server runs separately. Connect via NEXT_PUBLIC_SOCKET_URL.",
  });
}
