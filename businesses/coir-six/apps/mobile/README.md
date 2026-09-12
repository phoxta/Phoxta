# Coir Six — iOS & Android app

The native app for the Coir Six learning platform, built with Expo. It shares
its content, accounts and database with the web app: both talk to the same
Supabase project through the same code (`@coir-six/core`), so a lesson finished
on the phone is finished on the laptop the moment it is saved.

```bash
# from this folder (dependencies are installed by `npm install` at ../../)
cp .env.example .env.local        # Supabase URL + anon key (the web app's VITE_* values)
npx expo start                    # then a (Android), i (iOS, macOS only), w (web preview)
npx tsc --noEmit                  # typecheck
npx expo export --platform android   # bundle check without a device
```

## One app, every school

Coir Six is sold to many schools, and the stores reject one app per buyer from
the same publisher. So this is one "Coir Six" listing: on first sign-in the
learner types their school's web address (`yourschool.coir-six.phoxta.com`),
the app resolves that school the same way the website resolves its hostname,
themes itself with the school's brand, and scopes every query to it. The demo
("Explore as Jason") needs no school and works offline.

A white-label build for a school that publishes under its own developer
account is the same code with `EXPO_PUBLIC_ORG_ID`, name, icon and colours set
in `app.json` / `.env`.

## Layout

```
src/
  app/            Expo Router routes: (auth) login·signup·forgot·school · onboarding ·
                  (tabs) home·lessons·tasks·groups·inbox · courses · learn · mentors ·
                  progress · notifications · settings · certificates
  components/     ui primitives · charts · cards · shell (Screen, HomeBar, Header) · player
  state/          tenant · auth · data · toast providers (same shape as the web app)
  lib/            supabase client · env · theme (tokens + brand) · device store
assets/images/    icon, adaptive icon, splash, favicon (generated from the sparkle mark)
```

## Releasing

Store builds go through EAS (`eas build -p ios|android`), which builds iOS in
the cloud without a Mac, or locally with `npx expo run:android` /
`npx expo run:ios`. Bundle ids are `com.phoxta.coirsix` on both platforms.
Store accounts needed: Apple Developer Program, Google Play Console.
