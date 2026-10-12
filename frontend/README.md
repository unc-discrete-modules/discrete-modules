# Discrete Modules frontend

Requires npm, [React Router](https://reactrouter.com/start/framework/installation), ESLint, and [Prettier](https://prettier.io/docs/install).

```Shell
npm ci
npm install react-router-dom
npm install --save-dev prettier eslint-config-prettier
```

Run frontend commands from `frontend/`:

```Shell
npm run format
npm run lint
npm run build
npm run dev
```

The Vite development server normally uses `http://localhost:5173`. Use `npm run dev` to start the server.

All pages can be found in `frontend/src/pages`, while components are stored in `frontend/src/components`.

## Routing Guide

- Home: `/`
- Login: `/login`
- Module Overviews: `/modules/:id`
  - Module summary quiz: `/modules/:id/quiz`
- Lessons: `/lessons/:id`
  - Lesson-specific quiz: `/lesson/:id/quiz`
