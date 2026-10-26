# Discrete Modules frontend

Requires npm, [React Router](https://reactrouter.com/start/framework/installation), [Shadcn UI](https://ui.shadcn.com/docs/installation/vite#existing-vite-project), Tailwind CSS, ESLint, and [Prettier](https://prettier.io/docs/install).

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

The client checks `/api/auth/me` before loading learning pages or course data.
Anonymous visitors go to `/login`; expired sessions return there with the current
page saved. API requests, including lesson images at `/api/content/`, use the
same-origin `/api` proxy through NGINX in production and Vite locally. Set
`VITE_BACKEND_TARGET` in `frontend/.env.local` when the local backend is not at
`http://localhost:8000`. See the
[SAML guide](../backend/saml/README.md) for authentication setup and testing.

The login page temporarily has a **Sign in as demo user** button in all
builds, including production. It signs in as `demo@example.test` without UNC
SSO. The backend and a migrated database must be running. For local HTTP, use
the development settings in `backend/.env.example`.

TODO: Remove demo login once UNC sign-in is ready for general use.

All pages can be found in `frontend/src/pages`, while components are stored in `frontend/src/components`.

## Routing Guide

- Landing Page: `/`
- Login: `/login`
- Module Overviews: `/modules/:moduleId`
- Quizzes:`/modules/:moduleId/quiz/:quizId`
- Lessons: `/modules/:moduleId/lessons/:lessonId`
