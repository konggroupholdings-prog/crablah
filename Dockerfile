FROM python:3.12-slim
WORKDIR /app
COPY serve.py ./
COPY website ./website
COPY data ./data
ENV CRABLAH_HOST=0.0.0.0
ENV PORT=4175
EXPOSE 4175
CMD ["python", "serve.py"]
