import { Page, expect } from '@playwright/test';

/**
 * Helper functions for team management operations
 */
export class TeamHelper {
  constructor(private page: Page) {}

  /**
   * Navigate to the teams page
   */
  async navigateToTeamsPage() {
    await this.page.goto('/teams');
    await expect(this.page.locator('h1:has-text("Teams")')).toBeVisible();
  }

  /**
   * Create a new team
   * @param teamName Name of the team to create
   * @param teamSlug Optional slug for the team
   */
  async createTeam(teamName: string, teamSlug?: string) {
    await this.navigateToTeamsPage();
    
    await this.page.locator('[data-testid="create-team-button"]').click();
    
    await this.page.locator('input[name="name"]').fill(teamName);
    
    if (teamSlug) {
      await this.page.locator('input[name="slug"]').fill(teamSlug);
    }
    
    await this.page.locator('button[type="submit"]').click();
    
    await expect(
      this.page.locator('text=Team created successfully, text=Team Dashboard').first()
    ).toBeVisible({ timeout: 10000 });
  }

  /**
   * Invite a member to the current team
   * @param email Email of the user to invite
   * @param role Role to assign (owner, admin, member, viewer)
   */
  async inviteMember(email: string, role: 'owner' | 'admin' | 'member' | 'viewer') {
    await this.page.goto('/teams/members');
    await expect(this.page.locator('h1:has-text("Team Members")')).toBeVisible();
    
    await this.page.locator('[data-testid="invite-member-button"]').click();
    
    await this.page.locator('input[type="email"]').fill(email);
    
    await this.page.locator(`[data-testid="role-select"]`).click();
    await this.page.locator(`[data-testid="role-option-${role}"]`).click();
    
    await this.page.locator('[data-testid="send-invitation-button"]').click();
    
    await expect(this.page.locator('text=Invitation sent')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Change a team member's role
   * @param email Email of the member
   * @param newRole New role to assign
   */
  async changeRole(email: string, newRole: 'owner' | 'admin' | 'member' | 'viewer') {
    await this.page.goto('/teams/members');
    
    const memberRow = this.page.locator(`[data-testid="member-row-${email}"]`);
    
    await memberRow.locator('[data-testid="role-dropdown"]').click();
    
    await this.page.locator(`[data-testid="role-option-${newRole}"]`).click();
    
    await expect(this.page.locator('text=Role updated')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Remove a member from the team
   * @param email Email of the member to remove
   */
  async removeMember(email: string) {
    await this.page.goto('/teams/members');
    
    const memberRow = this.page.locator(`[data-testid="member-row-${email}"]`);
    
    await memberRow.locator('[data-testid="remove-member-button"]').click();
    
    await this.page.locator('[data-testid="confirm-remove-button"]').click();
    
    await expect(this.page.locator('text=Member removed')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get the list of team members
   * @returns Array of member emails
   */
  async getTeamMembers() {
    await this.page.goto('/teams/members');
    
    const memberRows = await this.page.locator('[data-testid^="member-row-"]').all();
    
    const memberEmails = [];
    for (const row of memberRows) {
      const emailElement = await row.locator('.member-email').first();
      if (emailElement) {
        memberEmails.push(await emailElement.textContent() || '');
      }
    }
    
    return memberEmails;
  }
}
