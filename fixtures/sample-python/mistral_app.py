from mistralai.client import Mistral

client = Mistral(api_key="example-only")

response = client.chat.complete(
    model="mistral-small-latest",
    messages=[{"role": "user", "content": "Hello"}],
)

print(response.choices[0].message.content)
