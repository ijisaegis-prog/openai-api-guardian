import google.generativeai as genai

model = genai.GenerativeModel("gemini-3.8-flash")
response = model.generate_content("Hello")
print(response.text)
