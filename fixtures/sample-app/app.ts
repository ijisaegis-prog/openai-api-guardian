import OpenAI from "openai";

const client = new OpenAI();

async function main() {
  const response =
    await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: "Hello from app.ts!",
        },
      ],
    });

  console.log(response);
}

main();
