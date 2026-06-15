FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app
COPY pyproject.toml ./
COPY astro_api ./astro_api
RUN python -m pip install --upgrade pip && python -m pip install .

EXPOSE 8000
CMD ["uvicorn", "astro_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
