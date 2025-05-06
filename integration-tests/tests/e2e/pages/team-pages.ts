import { Page, Locator } from '@playwright/test';

/**
 * Page object for the teams list page
 */
export class TeamsPage {
  readonly page: Page;
  readonly createTeamButton: Locator;
  readonly teamsList: Locator;
  private baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = 'http://test-frontend:5173';
    this.createTeamButton = page.locator('[data-testid="create-team-button"]');
    this.teamsList = page.locator('[data-testid="teams-list"]');
  }

  /**
   * Navigate to the teams page
   */
  async goto() {
    await this.page.goto(`${this.baseUrl}/teams`, { timeout: 60000 });
  }

  /**
   * Click on a team by name
   * @param name Name of the team
   */
  async clickTeam(name: string) {
    await this.page.locator(`[data-testid="team-item-${name}"]`).click();
  }

  /**
   * Check if a team exists
   * @param name Name of the team
   */
  async teamExists(name: string) {
    return await this.page.locator(`[data-testid="team-item-${name}"]`).isVisible();
  }
}

/**
 * Page object for the create team page
 */
export class CreateTeamPage {
  readonly page: Page;
  readonly nameInput: Locator;
  readonly slugInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.nameInput = page.locator('input[name="name"]');
    this.slugInput = page.locator('input[name="slug"]');
    this.submitButton = page.locator('button[type="submit"]');
  }

  /**
   * Fill in the create team form and submit
   * @param name Name for the team
   * @param slug Optional slug for the team
   */
  async createTeam(name: string, slug?: string) {
    await this.nameInput.fill(name);
    if (slug) {
      await this.slugInput.fill(slug);
    }
    await this.submitButton.click();
  }
}

/**
 * Page object for the team members page
 */
export class TeamMembersPage {
  readonly page: Page;
  readonly inviteMemberButton: Locator;
  readonly membersList: Locator;
  private baseUrl: string;

  constructor(page: Page) {
    this.page = page;
    this.baseUrl = 'http://test-frontend:5173';
    this.inviteMemberButton = page.locator('[data-testid="invite-member-button"]');
    this.membersList = page.locator('[data-testid="members-list"]');
  }

  /**
   * Navigate to the team members page
   */
  async goto() {
    await this.page.goto(`${this.baseUrl}/teams/members`, { timeout: 60000 });
  }

  /**
   * Invite a new member
   * @param email Email of the user to invite
   * @param role Role to assign
   */
  async inviteMember(email: string, role: 'owner' | 'admin' | 'member' | 'viewer') {
    await this.inviteMemberButton.click();
    await this.page.locator('input[type="email"]').fill(email);
    await this.page.locator('[data-testid="role-select"]').click();
    await this.page.locator(`[data-testid="role-option-${role}"]`).click();
    await this.page.locator('[data-testid="send-invitation-button"]').click();
  }

  /**
   * Change a member's role
   * @param email Email of the member
   * @param newRole New role to assign
   */
  async changeRole(email: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') {
    const memberRow = this.page.locator(`[data-testid="member-row-${email}"]`);
    await memberRow.locator('[data-testid="role-dropdown"]').click();
    await this.page.locator(`[data-testid="role-option-${newRole}"]`).click();
  }

  /**
   * Remove a member from the team
   * @param email Email of the member to remove
   */
  async removeMember(email: string) {
    const memberRow = this.page.locator(`[data-testid="member-row-${email}"]`);
    await memberRow.locator('[data-testid="remove-member-button"]').click();
    await this.page.locator('[data-testid="confirm-remove-button"]').click();
  }

  /**
   * Get the list of team members
   * @returns Array of member emails
   */
  async getTeamMembers(): Promise<string[]> {
    const memberRows = await this.page.locator('[data-testid^="member-row-"]').all();
    
    const memberEmails: string[] = [];
    for (const row of memberRows) {
      const emailElement = await row.locator('.member-email').first();
      if (emailElement) {
        memberEmails.push(await emailElement.textContent() || '');
      }
    }
    
    return memberEmails;
  }
}
