# Kitchen Buddy

Kitchen Buddy is a GPT-powered web app that's designed to help with rewriting recipes according to specific preferences. It provides a text input where the user can paste in a link to a recipe, and then fetches the recipe from the internet and passes that content to the OpenAI API along with instructions for how to rewrite the recipe. The app then returns a JSON object containing the rewritten ingredients list and step-by-step instructions.

## Try it out!

Clone the repository:

```
git clone https://github.com/sndurkin/kitchen-buddy.git
cd kitchen-buddy
```

Generate a private key (`key.pem`):

```
openssl genpkey -algorithm RSA -out key.pem
```

Generate a certificate signing request (`csr.pem`):

```
openssl req -new -key key.pem -out csr.pem
```

Generate a self-signed certificate (`cert.pem`):

```
openssl x509 -req -days 365 -in csr.pem -signkey key.pem -out cert.pem
```

Install dependencies:

```
npm install
```

Start the server:

```
npm start
```
