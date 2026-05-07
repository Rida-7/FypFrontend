# Frontend UI Enhancement (Minimal + Sky Blue + Animations)

Files added/updated:
- tailwind.config.cjs
- postcss.config.cjs
- src/index.css (Tailwind directives + small utilities)
- src/pages/SignIn.jsx (reworked UI)
- src/pages/SignUp.jsx (reworked UI)
- added lucide-react and framer-motion to dependencies in package.json
- public/auth-illustration.svg (simple illustration)

## To install and run locally

1. Install dependencies
```
cd frontend
npm install
```

2. Start dev server
```
npm run dev
```

If Tailwind styles do not show, run:
```
npx tailwindcss -i ./src/index.css -o ./dist/index.css --watch
```
