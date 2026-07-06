# Dockerfile pronto para Railway / Fly / VPS
# Faz o build a partir do fonte oficial rizrmd/whatsapp-web-api.
FROM golang:1.22-alpine AS builder
RUN apk add --no-cache git ca-certificates
WORKDIR /src
RUN git clone --depth=1 https://github.com/rizrmd/whatsapp-web-api.git .
RUN go mod tidy && CGO_ENABLED=0 go build -o /out/whatsapp-web-api .

FROM alpine:3.20
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=builder /out/whatsapp-web-api /app/whatsapp-web-api
EXPOSE 8080
ENV PORT=8080
CMD ["/app/whatsapp-web-api"]
