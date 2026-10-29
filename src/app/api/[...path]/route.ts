import { connection, NextResponse, type NextRequest } from "next/server";

export const maxDuration = 30;

const REQUEST_HEADERS = ["accept", "authorization", "content-type", "cookie"];

function apiOrigin() {
  const raw = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  await connection();

  const origin = apiOrigin();
  if (!origin) {
    return NextResponse.json(
      { message: "API_URL não está configurada neste projeto." },
      { status: 500 },
    );
  }

  const { path } = await context.params;
  if (path.some((part) => part === "." || part === "..")) {
    return NextResponse.json({ message: "Caminho inválido." }, { status: 400 });
  }

  const target = new URL(`${origin}/api/${path.map(encodeURIComponent).join("/")}`);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: "manual",
      duplex: hasBody ? "half" : undefined,
    } as RequestInit);
  } catch {
    return NextResponse.json(
      { message: "Não foi possível falar com a API." },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  const disposition = upstream.headers.get("content-disposition");
  const location = upstream.headers.get("location");
  if (contentType) responseHeaders.set("content-type", contentType);
  if (disposition) responseHeaders.set("content-disposition", disposition);
  if (location) responseHeaders.set("location", location);
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
