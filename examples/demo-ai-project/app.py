from openai import OpenAI
import xai_sdk
from mistralai.client import Mistral

openai_client = OpenAI()
xai_client = xai_sdk.Client()
mistral_client = Mistral()

response = openai_client.chat.completions.create(
    model="gpt-5.6-luna",
    messages=[{"role": "user", "content": "Hello"}],
)

print(response)
