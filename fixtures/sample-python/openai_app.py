from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-5.6-luna",
    messages=[{"role": "user", "content": "Hello"}],
)

print(response.choices[0].message.content)
