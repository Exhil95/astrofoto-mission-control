from astro_api.profiles import create_profile, delete_profile, list_profiles, update_profile
from astro_api.schemas import ProfileCreate, ProfileUpdate
from astro_api.settings import get_settings


def test_profiles_seed_and_crud(tmp_path) -> None:
    get_settings.cache_clear()
    settings = get_settings()
    settings.profile_database_url = f"sqlite:///{tmp_path / 'profiles.sqlite3'}"

    try:
        seeded = list_profiles()

        assert len(seeded) == 3
        assert seeded[0].name == "Backyard APS-C"

        created = create_profile(
            ProfileCreate(
                name="Balcony Narrowband",
                site_name="Home",
                latitude_deg=50.1,
                longitude_deg=19.1,
                timezone="Europe/Warsaw",
                bortle=6,
                telescope_name="Small Refractor",
                focal_length_mm=360,
                reducer=1,
                sensor_id="imx533",
                sensor_name="Sony IMX533",
                sensor_width_mm=11.31,
                sensor_height_mm=11.31,
                pixel_size_um=3.76,
            )
        )

        assert created.id > 0
        assert created.site_name == "Home"
        assert len(list_profiles()) == 4

        updated = update_profile(
            created.id,
            ProfileUpdate(
                **created.model_copy(update={"name": "Balcony Updated"}).model_dump(
                    exclude={"id", "updated_at"}
                )
            ),
        )

        assert updated is not None
        assert updated.name == "Balcony Updated"
        assert delete_profile(created.id) is True
        assert delete_profile(created.id) is False
    finally:
        get_settings.cache_clear()
