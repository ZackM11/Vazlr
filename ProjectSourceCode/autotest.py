import subprocess
import time
import urllib.error
import urllib.request

COMPOSE_FILE = "docker-compose.yaml"
URL = "http://localhost:3000/login"
TIMEOUT = 60  # Maximum startup time in seconds


def main():
    # 1. Start Docker Compose in the background
    subprocess.run(
        ["docker", "compose", "-f", COMPOSE_FILE, "up", "-d"],
        check=True,
    )

    # 2. Block until the server is ready
    print("Waiting for server to start...")
    deadline = time.monotonic() + TIMEOUT
    last_error = None

    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(URL, timeout=2) as response:
                if response.status == 200:
                    print("Server is ready! HTTP 200")
                    return

                last_error = f"HTTP {response.status}"

        except urllib.error.HTTPError as e:
            last_error = f"HTTP {e.code}"

        except (urllib.error.URLError, TimeoutError) as e:
            last_error = str(e)

        print("sleeping")
        time.sleep(1)

    # 3. Error if the server never returned HTTP 200
    raise RuntimeError(
        f"Server failed to become ready and load /login within {TIMEOUT}s. Last error: {last_error}"
    )


if __name__ == "__main__":
    main()
