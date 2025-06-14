FROM golang:1.24 AS builder

WORKDIR /app

COPY ../go.mod ../go.sum ./
RUN go mod download

COPY .. .
RUN go build -o steam-distiller /app

FROM debian:bookworm-slim

WORKDIR /app

COPY .. .
COPY --from=builder /app/steam-distiller /app/

RUN apt-get update \
    && apt-get install -y --no-install-recommends sqlite3 \
    && rm -rf /var/lib/apt/lists/*

CMD ["/app/steam-distiller"]
