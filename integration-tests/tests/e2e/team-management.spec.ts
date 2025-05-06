import { test, expect } from '@playwright/test';
import { AuthHelper } from './helpers/auth-helper';
import { TeamHelper } from './helpers/team-helper';
import { TeamsPage, CreateTeamPage, TeamMembersPage } from './pages/team-pages';

const TEST_USER = {
  email: 'test@example.com',
  password: 'Password123!'
};

const TEST_TEAM = {
  name: `Test Team ${Date.now()}`,
  slug: `test-team-${Date.now()}`
};

const TEST_MEMBER = {
  email: 'team-member@example.com',
  role: 'member' as const
};

test.describe('Team Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    const authHelper = new AuthHelper(page);
    await authHelper.login(TEST_USER.email, TEST_USER.password);
  });
  
  test('should create a new team', async ({ page }) => {
    const teamsPage = new TeamsPage(page);
    await teamsPage.goto();
    
    await expect(page).toHaveTitle(/Teams/);
    
    await teamsPage.createTeamButton.click();
    
    const createTeamPage = new CreateTeamPage(page);
    await createTeamPage.createTeam(TEST_TEAM.name, TEST_TEAM.slug);
    
    await expect(
      page.locator('text=Team created successfully, text=Team Dashboard').first()
    ).toBeVisible();
    
    await teamsPage.goto();
    await expect(page.locator(`[data-testid="team-item-${TEST_TEAM.name}"]`)).toBeVisible();
  });
  
  test('should invite a member to the team', async ({ page }) => {
    const teamMembersPage = new TeamMembersPage(page);
    await teamMembersPage.goto();
    
    await expect(page).toHaveTitle(/Team Members/);
    
    await teamMembersPage.inviteMember(TEST_MEMBER.email, TEST_MEMBER.role);
    
    await expect(page.locator('text=Invitation sent')).toBeVisible();
  });
  
  test('should change a member\'s role', async ({ page }) => {
    const teamHelper = new TeamHelper(page);
    
    await teamHelper.navigateToTeamsPage();
    
    const members = await teamHelper.getTeamMembers();
    
    if (members.includes(TEST_MEMBER.email)) {
      await teamHelper.changeRole(TEST_MEMBER.email, 'admin');
      
      await expect(page.locator('text=Role updated')).toBeVisible();
    } else {
      test.skip();
    }
  });
  
  test('should remove a member from the team', async ({ page }) => {
    const teamHelper = new TeamHelper(page);
    
    await teamHelper.navigateToTeamsPage();
    
    const members = await teamHelper.getTeamMembers();
    
    if (members.includes(TEST_MEMBER.email)) {
      await teamHelper.removeMember(TEST_MEMBER.email);
      
      await expect(page.locator('text=Member removed')).toBeVisible();
      
      const updatedMembers = await teamHelper.getTeamMembers();
      expect(updatedMembers).not.toContain(TEST_MEMBER.email);
    } else {
      test.skip();
    }
  });
});
