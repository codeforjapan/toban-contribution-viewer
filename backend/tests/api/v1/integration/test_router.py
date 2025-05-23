"""
Tests for the integration API endpoints.
"""

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.integration.router import router
from app.models.integration import (
    Integration,
    IntegrationStatus,
    IntegrationType,
    ServiceResource,
)


@pytest.fixture
def test_integration_id():
    """Test integration ID."""
    return uuid.uuid4()


@pytest.fixture
def test_team_id():
    """Test team ID."""
    return uuid.uuid4()


@pytest.fixture
def test_user_id():
    """Test user ID."""
    return "user123"


@pytest.fixture
def mock_current_user(test_user_id):
    """Mock current user dependency."""
    return {"id": test_user_id, "email": "user@example.com"}


@pytest.fixture
def mock_db():
    """Mock database session dependency."""
    return AsyncMock(spec=AsyncSession)


@pytest.fixture
def mock_has_team_permission():
    """Mock has_team_permission function."""
    with patch("app.api.v1.integration.router.has_team_permission") as mock:
        mock.return_value = True
        yield mock


@pytest.fixture
def test_app(mock_current_user, mock_db, mock_has_team_permission):
    """Create test FastAPI app with dependencies overridden."""
    app = FastAPI()
    app.include_router(router)

    # Override dependencies
    app.dependency_overrides = {
        # AsyncSession: lambda: mock_db,
        # get_current_user: lambda: mock_current_user,
    }

    return app


@pytest.fixture
def test_client(test_app):
    """Create test client for the app."""
    return TestClient(test_app)


class TestIntegrationAPI:
    """Tests for the integration API endpoints."""

    @patch("app.api.v1.integration.router.IntegrationService.get_team_integrations")
    async def test_get_integrations(
        self,
        mock_get_team_integrations,
        test_client,
        test_team_id,
        mock_current_user,
        mock_db,
    ):
        """Test getting integrations for a team."""
        # Setup
        test_integration = Integration(
            id=uuid.uuid4(),
            name="Test Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team_id=test_team_id,
            created_by_user_id=mock_current_user["id"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        with patch("app.api.v1.integration.router.has_team_permission", return_value=True), patch(
            "app.api.v1.integration.router.get_current_user",
            return_value=mock_current_user,
        ), patch("app.api.v1.integration.router.get_async_db", return_value=mock_db):
            mock_get_team_integrations.return_value = [test_integration]

            # Execute
            response = test_client.get(
                f"/integrations?team_id={test_team_id}",
                headers={"Authorization": "Bearer test_token"},
            )

            # Assert
            assert response.status_code == status.HTTP_200_OK
            assert len(response.json()) == 1
            assert response.json()[0]["name"] == test_integration.name
            mock_get_team_integrations.assert_called_once()

    @patch("app.api.v1.integration.router.IntegrationService.get_team_integrations")
    @patch("app.api.v1.integration.router.prepare_integration_response")
    async def test_get_integrations_with_credentials_param(
        self,
        mock_prepare_response,
        mock_get_team_integrations,
        test_client,
        test_team_id,
        mock_current_user,
        mock_db,
    ):
        """Test that include_credentials parameter is respected in the GET multiple integrations endpoint."""
        # Setup
        test_integration = Integration(
            id=uuid.uuid4(),
            name="Test Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team_id=test_team_id,
            created_by_user_id=mock_current_user["id"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Mock the response with credentials
        from app.api.v1.integration.schemas import CredentialResponse, IntegrationResponse, TeamInfo, UserInfo

        mock_response = IntegrationResponse(
            id=test_integration.id,
            name="Test Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team=TeamInfo(id=test_team_id, name="Test Team", slug="test-team"),
            created_by=UserInfo(id=mock_current_user["id"]),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            credentials=[
                CredentialResponse(
                    id=uuid.uuid4(),
                    credential_type="oauth_token",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            ],
        )

        mock_prepare_response.return_value = mock_response

        with patch("app.api.v1.integration.router.has_team_permission", return_value=True), patch(
            "app.api.v1.integration.router.get_current_user",
            return_value=mock_current_user,
        ), patch("app.api.v1.integration.router.get_async_db", return_value=mock_db):
            mock_get_team_integrations.return_value = [test_integration]

            # Case 1: Default behavior (no credentials)
            response = test_client.get(
                f"/integrations?team_id={test_team_id}",
                headers={"Authorization": "Bearer test_token"},
            )
            assert response.status_code == status.HTTP_200_OK
            assert len(response.json()) == 1
            # Credentials should be empty by default
            assert response.json()[0].get("credentials") == []

            # Case 2: Explicitly request credentials
            response = test_client.get(
                f"/integrations?team_id={test_team_id}&include_credentials=true",
                headers={"Authorization": "Bearer test_token"},
            )
            assert response.status_code == status.HTTP_200_OK
            assert len(response.json()) == 1
            # Credentials should be present when explicitly requested
            assert len(response.json()[0].get("credentials", [])) == 1

    @patch("app.api.v1.integration.router.IntegrationService.create_integration")
    async def test_create_integration(
        self,
        mock_create_integration,
        test_client,
        test_team_id,
        mock_current_user,
        mock_db,
    ):
        """Test creating a new integration."""
        # Setup
        test_integration = Integration(
            id=uuid.uuid4(),
            name="New Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team_id=test_team_id,
            created_by_user_id=mock_current_user["id"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        with patch("app.api.v1.integration.router.has_team_permission", return_value=True), patch(
            "app.api.v1.integration.router.get_current_user",
            return_value=mock_current_user,
        ), patch("app.api.v1.integration.router.get_async_db", return_value=mock_db):
            mock_create_integration.return_value = test_integration

            # Execute
            response = test_client.post(
                "/integrations",
                json={
                    "name": "New Integration",
                    "service_type": "slack",
                    "team_id": str(test_team_id),
                },
                headers={"Authorization": "Bearer test_token"},
            )

            # Assert
            assert response.status_code == status.HTTP_201_CREATED
            assert response.json()["name"] == test_integration.name
            mock_create_integration.assert_called_once()

    @patch("app.api.v1.integration.router.SlackIntegrationService.create_from_oauth")
    async def test_create_slack_integration(
        self,
        mock_create_from_oauth,
        test_client,
        test_team_id,
        mock_current_user,
        mock_db,
    ):
        """Test creating a new Slack integration via OAuth."""
        # Setup
        test_integration = Integration(
            id=uuid.uuid4(),
            name="Slack Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team_id=test_team_id,
            created_by_user_id=mock_current_user["id"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        workspace_info = {
            "team": {
                "id": "T12345",
                "name": "Test Workspace",
                "domain": "test",
            }
        }

        with patch("app.api.v1.integration.router.has_team_permission", return_value=True), patch(
            "app.api.v1.integration.router.get_current_user",
            return_value=mock_current_user,
        ), patch("app.api.v1.integration.router.get_async_db", return_value=mock_db):
            mock_create_from_oauth.return_value = (test_integration, workspace_info)

            # Execute
            response = test_client.post(
                "/integrations/slack",
                json={
                    "name": "Slack Integration",
                    "service_type": "slack",
                    "team_id": str(test_team_id),
                    "code": "test_code",
                    "redirect_uri": "https://example.com/callback",
                },
                headers={"Authorization": "Bearer test_token"},
            )

            # Assert
            assert response.status_code == status.HTTP_201_CREATED
            assert response.json()["name"] == test_integration.name
            mock_create_from_oauth.assert_called_once()

    @patch("app.api.v1.integration.router.IntegrationService.get_integration")
    async def test_get_integration(
        self,
        mock_get_integration,
        test_client,
        test_integration_id,
        test_team_id,
        mock_current_user,
        mock_db,
    ):
        """Test getting a specific integration."""
        # Setup
        test_integration = Integration(
            id=test_integration_id,
            name="Test Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team_id=test_team_id,
            created_by_user_id=mock_current_user["id"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        with patch(
            "app.api.v1.integration.router.get_current_user",
            return_value=mock_current_user,
        ), patch("app.api.v1.integration.router.get_async_db", return_value=mock_db):
            mock_get_integration.return_value = test_integration

            # Execute
            response = test_client.get(
                f"/integrations/{test_integration_id}",
                headers={"Authorization": "Bearer test_token"},
            )

            # Assert
            assert response.status_code == status.HTTP_200_OK
            assert response.json()["name"] == test_integration.name
            mock_get_integration.assert_called_once()

    @patch("app.api.v1.integration.router.IntegrationService.get_integration")
    @patch("app.api.v1.integration.router.prepare_integration_response")
    async def test_get_integration_with_credentials_param(
        self,
        mock_prepare_response,
        mock_get_integration,
        test_client,
        test_integration_id,
        test_team_id,
        mock_current_user,
        mock_db,
    ):
        """Test that include_credentials parameter is respected."""
        # Setup
        test_integration = Integration(
            id=test_integration_id,
            name="Test Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team_id=test_team_id,
            created_by_user_id=mock_current_user["id"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        # Mock the response with credentials
        from app.api.v1.integration.schemas import CredentialResponse, IntegrationResponse, TeamInfo, UserInfo

        mock_response = IntegrationResponse(
            id=test_integration_id,
            name="Test Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team=TeamInfo(id=test_team_id, name="Test Team", slug="test-team"),
            created_by=UserInfo(id=mock_current_user["id"]),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            credentials=[
                CredentialResponse(
                    id=uuid.uuid4(),
                    credential_type="oauth_token",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )
            ],
        )

        mock_prepare_response.return_value = mock_response

        with patch(
            "app.api.v1.integration.router.get_current_user",
            return_value=mock_current_user,
        ), patch("app.api.v1.integration.router.get_async_db", return_value=mock_db):
            mock_get_integration.return_value = test_integration

            # Case 1: Default behavior (no credentials)
            response = test_client.get(
                f"/integrations/{test_integration_id}",
                headers={"Authorization": "Bearer test_token"},
            )
            assert response.status_code == status.HTTP_200_OK
            # Credentials should be empty by default
            assert response.json().get("credentials") == []

            # Case 2: Explicitly request credentials
            response = test_client.get(
                f"/integrations/{test_integration_id}?include_credentials=true",
                headers={"Authorization": "Bearer test_token"},
            )
            assert response.status_code == status.HTTP_200_OK
            # Credentials should be present
            assert len(response.json().get("credentials", [])) == 1

    @patch("app.api.v1.integration.router.IntegrationService.get_integration_resources")
    @patch("app.api.v1.integration.router.IntegrationService.get_integration")
    async def test_get_integration_resources(
        self,
        mock_get_integration,
        mock_get_resources,
        test_client,
        test_integration_id,
        test_team_id,
        mock_current_user,
        mock_db,
    ):
        """Test getting resources for an integration."""
        # Setup
        test_integration = Integration(
            id=test_integration_id,
            name="Test Integration",
            service_type=IntegrationType.SLACK,
            status=IntegrationStatus.ACTIVE,
            owner_team_id=test_team_id,
            created_by_user_id=mock_current_user["id"],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        test_resource = ServiceResource(
            id=uuid.uuid4(),
            integration_id=test_integration_id,
            resource_type="slack_channel",
            external_id="C12345",
            name="general",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )

        with patch(
            "app.api.v1.integration.router.get_current_user",
            return_value=mock_current_user,
        ), patch("app.api.v1.integration.router.get_async_db", return_value=mock_db):
            mock_get_integration.return_value = test_integration
            mock_get_resources.return_value = [test_resource]

            # Execute
            response = test_client.get(
                f"/integrations/{test_integration_id}/resources",
                headers={"Authorization": "Bearer test_token"},
            )

            # Assert
            assert response.status_code == status.HTTP_200_OK
            assert len(response.json()) == 1
            assert response.json()[0]["name"] == test_resource.name
            mock_get_integration.assert_called_once()
            mock_get_resources.assert_called_once()
