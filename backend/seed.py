from sqlmodel import Session, select
from datetime import date
from database import engine, create_db_and_tables
from models import DisasterEvent

NDMA_EVENTS = [
    (2004, 12, "Chennai",       "Tamil Nadu",   "tsunami",    10, 2800000,  10749, "2004 Indian Ocean Tsunami"),
    (2005, 7,  "Mumbai",        "Maharashtra",  "flood",      9,  1500000,  1094,  "2005 Maharashtra floods - 944mm rain in 24hrs"),
    (2008, 8,  "Bhubaneswar",   "Odisha",       "flood",      8,  2300000,  107,   "2008 Bihar-Kosi floods"),
    (2013, 6,  "Bhopal",        "MP",           "flood",      8,  850000,   5748,  "2013 Uttarakhand floods"),
    (2014, 10, "Visakhapatnam", "AP",           "cyclone",    9,  12000000, 61,    "Cyclone Hudhud - Category 4"),
    (2015, 11, "Chennai",       "Tamil Nadu",   "flood",      9,  4000000,  500,   "2015 Chennai floods - worst in 100 years"),
    (2016, 10, "Bhubaneswar",   "Odisha",       "cyclone",    8,  600000,   33,    "Cyclone Titli 2018"),
    (2018, 8,  "Kochi",         "Kerala",       "flood",      10, 5400000,  483,   "2018 Kerala floods - worst in a century"),
    (2019, 10, "Visakhapatnam", "AP",           "cyclone",    9,  1000000,  89,    "Cyclone Fani - Category 5 equivalent"),
    (2020, 5,  "Bhubaneswar",   "Odisha",       "cyclone",    9,  3800000,  128,   "Cyclone Amphan - Super Cyclone"),
    (2021, 7,  "Mumbai",        "Maharashtra",  "landslide",  8,  400000,   229,   "2021 Maharashtra landslides"),
    (2021, 10, "Bhubaneswar",   "Odisha",       "cyclone",    7,  1200000,  3,     "Cyclone Yaas 2021"),
    (2022, 6,  "Bhopal",        "MP",           "flood",      7,  500000,   88,    "2022 MP floods"),
    (2022, 9,  "Ahmedabad",     "Gujarat",      "flood",      8,  800000,   196,   "2022 Gujarat floods"),
    (2023, 7,  "Delhi",         "Delhi",        "flood",      8,  350000,   44,    "2023 Delhi Yamuna floods - highest level since 1978"),
    (2023, 7,  "Bhopal",        "MP",           "flood",      7,  450000,   72,    "2023 Himachal Pradesh floods"),
    (2023, 10, "Chennai",       "Tamil Nadu",   "cyclone",    7,  700000,   13,    "Cyclone Michaung 2023"),
    (2001, 1,  "Ahmedabad",     "Gujarat",      "earthquake", 10, 600000,   20005, "2001 Bhuj Earthquake M7.7"),
    (2004, 9,  "Pune",          "Maharashtra",  "flood",      7,  200000,   29,    "2004 Pune floods"),
    (2009, 10, "Kochi",         "Kerala",       "flood",      7,  300000,   180,   "2009 Andhra floods"),
    (2010, 8,  "Delhi",         "Delhi",        "flood",      6,  500000,   43,    "2010 North India floods"),
    (2011, 9,  "Delhi",         "Delhi",        "earthquake", 5,  50000,    97,    "2011 Sikkim Earthquake M6.9"),
    (2012, 8,  "Lucknow",       "UP",           "flood",      7,  1200000,  502,   "2012 Assam-North India floods"),
    (2016, 4,  "Chennai",       "Tamil Nadu",   "heatwave",   9,  400000,   400,   "2016 South India heatwave"),
    (2019, 6,  "Delhi",         "Delhi",        "heatwave",   9,  500000,   184,   "2019 North India heatwave 50.8°C"),
    (2020, 3,  "Delhi",         "Delhi",        "heatwave",   7,  300000,   22,    "2020 pre-monsoon heatwave"),
    (2003, 5,  "Ahmedabad",     "Gujarat",      "heatwave",   9,  800000,   1210,  "2003 Gujarat heatwave"),
    (2015, 5,  "Hyderabad",     "Telangana",    "heatwave",   10, 1200000,  2500,  "2015 Andhra-Telangana heatwave"),
    (2017, 8,  "Mumbai",        "Maharashtra",  "flood",      8,  800000,   1200,  "2017 Mumbai flooding"),
    (2022, 5,  "Kolkata",       "West Bengal",  "cyclone",    7,  1500000,  2,     "Cyclone Asani 2022"),
]

def ensure_seed_data(verbose=True):
    if verbose:
        print("Creating tables...")
    create_db_and_tables()

    if verbose:
        print("Seeding database...")
    with Session(engine) as session:
        existing_events = session.exec(select(DisasterEvent.id).limit(1)).first()
        if existing_events is not None:
            if verbose:
                print("Database already contains seed data. Skipping duplicate inserts.")
            return

        for ev in NDMA_EVENTS:
            year, month, city, state, disaster_type, severity, affected_population, deaths, description = ev
            
            # Simple risk mapping
            risk_level = "Low"
            if affected_population > 500000 or deaths > 1000: risk_level = "Critical"
            elif affected_population > 100000 or deaths > 100: risk_level = "High"
            elif affected_population > 20000 or deaths > 10: risk_level = "Medium"
            
            # Create object
            db_event = DisasterEvent(
                city=city,
                state=state,
                date=date(year, month, 1),
                disaster_type=disaster_type,
                severity=severity,
                risk_level=risk_level,
                affected_population=affected_population,
                total_deaths=deaths,
                lat=0.0, # Dummy coord for seed
                lon=0.0,
                description=description,
                data_source="ndma"
            )
            session.add(db_event)
        session.commit()
    if verbose:
        print("Database seeded successfully with NDMA records.")


def seed():
    ensure_seed_data(verbose=True)

if __name__ == "__main__":
    seed()
