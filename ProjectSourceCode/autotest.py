import json
import subprocess
import time
import urllib.error
import urllib.request
from tokenize import String

COMPOSE_FILE = "docker-compose.yaml"
TIMEOUT = 60  # Maximum startup time in seconds


def startup():
    # 1. Start Docker Compose in the background
    x = subprocess.run(
        ["docker", "compose", "-f", COMPOSE_FILE, "up", "--wait"],
        check=True,
    )

    print(x)

    # 2. Block until the server is ready
    print("Waiting for server to start...")
    deadline = time.monotonic() + TIMEOUT
    last_error = None

    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(
                "http://localhost:3000/login", timeout=2
            ) as response:
                if response.status == 200:
                    print("Server is ready! HTTP 200")
                    return

                last_error = f"HTTP {response.status}"

        except urllib.error.HTTPError as e:
            last_error = f"HTTP {e.code}"

        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            last_error = str(e)

        print("sleeping 1 second")
        time.sleep(1)

    # 3. Error if the server never returned HTTP 200
    raise RuntimeError(
        f"Server failed to become ready and load /login within {TIMEOUT}s. Last error: {last_error}"
    )


def page_exists(url: str):
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            if response.status == 200:
                print(f"Page {url} exists")
                return

    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Failed to open page {url}. Status code HTTP {e.code}")

    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise RuntimeError(f"Failed to open page {url}. Internal error {str(e)}")


def register_api(url: str):

    body = {"email": "gloriousUser@gmail.com", "password": "4"}
    data = json.dumps(body).encode("utf-8")

    try:
        req = urllib.request.Request(
            url, data=data, headers={"Content-Type": "application/json"}, method="POST"
        )

        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                print(
                    f"Register page: {url} works and returns result: {response.read().decode('utf-8')}"
                )
                return

    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Failed to open page {url}. Status code HTTP {e.code}")

    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise RuntimeError(f"Failed to open page {url}. Internal error {str(e)}")


def page_contains_keys(url: str, keys: list[str]):
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            data = str(response.read()).split(" ")
            for i in range(len(keys)):
                if keys[i] in data:
                    print(f"Key {keys[i]} included in page {url}")
                    return
                raise RuntimeError(f"Key {keys[i]} not included in page {url}")

    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Failed to open page {url}. Status code HTTP {e.code}")

    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise RuntimeError(f"Failed to open page {url}. Internal error {str(e)}")


def page_not_contains_keys(url: str, keys: list[str]):
    try:
        with urllib.request.urlopen(url, timeout=2) as response:
            data = str(response.read()).split(" ")
            for i in range(len(keys)):
                if keys[i] in data:
                    raise RuntimeError(
                        f"Key {keys[i]} included in page {url}, and it shouldn't be"
                    )
                print(f"Key {keys[i]} not included in page {url} (This is good)")
                return

    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Failed to open page {url}. Status code HTTP {e.code}")

    except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
        raise RuntimeError(f"Failed to open page {url}. Internal error {str(e)}")


# TODO: test for strings

if __name__ == "__main__":
    startup()
    page_exists("http://localhost:3000/register")
    register_api("http://localhost:3000/volunteers/register")
    page_contains_keys(
        "http://localhost:3000/volunteers/minion-dash",
        [
            "SkibidiHeaderIncluded67",
            "SkibidiNavBarIncluded67",
            "SkibidiPartialCalendarIncluded67",
            "SkibidiFooterIncluded67",
        ],
    )
    page_not_contains_keys(
        "http://localhost:3000/register", ["SkibidiPartialCalendarIncluded67"]
    )
