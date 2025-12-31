import { defineConfig } from "vitest/config"

export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        include: ["src/tests/**/*.{test,spec}.ts"],
        exclude: ["node_modules", ".plasmo", "build"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            include: ["src/lib/**/*.ts", "src/adapters/**/*.ts"],
            exclude: ["src/tests/**", "**/*.d.ts"]
        }
    }
})
