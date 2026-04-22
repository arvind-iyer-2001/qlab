FROM python:3.12-slim

WORKDIR /app

# Install q binary (you'll need to mount your q installation or COPY it)
# For personal/on-demand license, q connects to Kx servers on startup
# Ensure the container has internet access for license validation
# COPY --from=your-q-image /usr/local/bin/q /usr/local/bin/q

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
