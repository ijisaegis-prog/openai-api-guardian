import anthropic

client = anthropic.Anthropic()
message = client.messages.create(
    model="claude-opus-5",
    max_tokens=128,
    messages=[{"role": "user", "content": "Hello"}],
)
print(message.content)
