def get_recommendations(disaster):

    recommendations = {

        "flood": [

            "Avoid walking or driving through floodwater.",

            "Move to higher ground if advised by authorities.",

            "Keep away from electrical equipment in flooded areas.",

            "Contact local emergency services if people are trapped."

        ],


        "fire": [

            "Move away from flames and smoke.",

            "Do not re-enter an affected building.",

            "Contact the local fire service.",

            "Follow official evacuation instructions."

        ],


        "earthquake": [

            "During shaking, Drop, Cover and Hold On.",

            "Stay away from damaged structures.",

            "Watch for aftershocks.",

            "Follow official safety instructions."

        ],


        "landslide": [

            "Keep away from unstable slopes.",

            "Avoid landslide paths and channels.",

            "Follow evacuation instructions.",

            "Report blocked roads to local authorities."

        ],


        "normal": [

            "No disaster detected by the current model.",

            "Continue monitoring official information."

        ]

    }

    return recommendations.get(
        disaster,
        ["Verify the report with local authorities."]
    )