export const PLAN_LIMITS = {
  free: {
    generate: 30,
    chat: 50,
    debug: 20,
    improve: 20,
    convert: 10,
    tests: 10,
    projects: 5,
  },

  pro: {
    generate: 500,
    chat: 1000,
    debug: 300,
    improve: 300,
    convert: 200,
    tests: 200,
    projects: 50,
  },

  promax: {
    generate: 2000,
    chat: 5000,
    debug: 1000,
    improve: 1000,
    convert: 1000,
    tests: 1000,
    projects: 200,
  },
} as const;