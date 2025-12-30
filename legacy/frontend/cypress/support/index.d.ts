declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command that adds two given numbers
     */
    mailinator(email: string): Chainable<string>
  }
}
