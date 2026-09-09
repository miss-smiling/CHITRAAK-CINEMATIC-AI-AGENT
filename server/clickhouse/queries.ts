import { clickhouse } from "./client.ts";

export async function getEntity(entityId: string) {
  const result = await clickhouse.query({
    query: `
      SELECT
        id,
        entity_type,
        name,
        canonical_description,
        reference_image_url,
        current_state,
        updated_at
      FROM entities
      WHERE id = {entityId:String}
      LIMIT 1
    `,
    query_params: {
      entityId,
    },
    format: "JSONEachRow",
  });

  const rows = await result.json();

  return rows[0] ?? null;
}

export async function getEntitiesForShot(shotId: string) {
  const result = await clickhouse.query({
    query: `
      SELECT
        se.shot_id,
        se.entity_id,
        se.role,
        e.entity_type,
        e.name,
        e.canonical_description,
        e.reference_image_url,
        e.current_state,
        e.updated_at
      FROM shot_entities AS se
      INNER JOIN entities AS e
        ON se.entity_id = e.id
      WHERE se.shot_id = {shotId:String}
      ORDER BY se.role
    `,
    query_params: {
      shotId,
    },
    format: "JSONEachRow",
  });

  return await result.json();
}

export async function saveShot(
  id: string,
  sceneId: string,
  shotNumber: number,
  description: string,
  generatedImageUrl: string = "",
  shotType: string = "",
  mood: string = "",
  actionBeat: string = "",
  prompt: string = "",
  negativePrompt: string = "",
  seed: number = 0,
  aiModel: string = "",
  aspectRatio: string = "16:9",
  focalLength: string = "",
  cameraAngle: string = "",
  cameraMovement: string = "",
  lightingStyle: string = ""
) {
  await clickhouse.insert({
    table: "shots",
    values: [
      {
        id,
        scene_id: sceneId,
        shot_number: shotNumber,
        description,
        generated_image_url: generatedImageUrl,
        status: "planned",

        shot_type: shotType,
        mood,
        action_beat: actionBeat,
        prompt,
        negative_prompt: negativePrompt,
        seed,
        ai_model: aiModel,
        aspect_ratio: aspectRatio,
        focal_length: focalLength,
        camera_angle: cameraAngle,
        camera_movement: cameraMovement,
        lighting_style: lightingStyle,
      },
    ],
    format: "JSONEachRow",
  });
}

export async function linkEntityToShot(
  shotId: string,
  entityId: string,
  role: string
) {
  await clickhouse.insert({
    table: "shot_entities",
    values: [
      {
        shot_id: shotId,
        entity_id: entityId,
        role,
      },
    ],
    format: "JSONEachRow",
  });
}

export async function saveStateChange(
  entityId: string,
  shotId: string,
  previousState: string,
  newState: string,
  reason: string
) {
  await clickhouse.insert({
    table: "state_history",
    values: [
      {
        entity_id: entityId,
        shot_id: shotId,
        previous_state: previousState,
        new_state: newState,
        reason,
      },
    ],
    format: "JSONEachRow",
  });
}

export async function getStateHistory(entityId: string) {
  const result = await clickhouse.query({
    query: `
      SELECT
        entity_id,
        shot_id,
        previous_state,
        new_state,
        reason,
        created_at
      FROM state_history
      WHERE entity_id = {entityId:String}
      ORDER BY created_at DESC
    `,
    query_params: {
      entityId,
    },
    format: "JSONEachRow",
  });

  return await result.json();
}

export async function saveDrift(
  shotId: string,
  entityId: string,
  expectedState: string,
  detectedState: string,
  driftScore: number,
  reason: string
) {
  await clickhouse.insert({
    table: "drift_history",
    values: [
      {
        shot_id: shotId,
        entity_id: entityId,
        expected_state: expectedState,
        detected_state: detectedState,
        drift_score: driftScore,
        reason,
      },
    ],
    format: "JSONEachRow",
  });
}

export async function getDriftHistory(shotId: string) {
  const result = await clickhouse.query({
    query: `
      SELECT
        shot_id,
        entity_id,
        expected_state,
        detected_state,
        drift_score,
        reason,
        created_at
      FROM drift_history
      WHERE shot_id = {shotId:String}
      ORDER BY created_at DESC
    `,
    query_params: {
      shotId,
    },
    format: "JSONEachRow",
  });

  return await result.json();
}

export async function updateEntityState(
  entityId: string,
  newState: string
) {
  await clickhouse.command({
    query: `
      ALTER TABLE entities
      UPDATE
        current_state = {newState:String},
        updated_at = now()
      WHERE id = {entityId:String}
    `,
    query_params: {
      entityId,
      newState,
    },
  });
}

export async function findInvalidShotEntityLinks() {
  const result = await clickhouse.query({
    query: `
      SELECT
        se.shot_id,
        se.entity_id,
        se.role
      FROM shot_entities AS se
      LEFT JOIN shots AS s
        ON se.shot_id = s.id
      LEFT JOIN entities AS e
        ON se.entity_id = e.id
      WHERE s.id IS NULL
         OR e.id IS NULL
    `,
    format: "JSONEachRow",
  });

  return await result.json();
}

export async function getAllShots() {
  const result = await clickhouse.query({
    query: `
      SELECT
        id,
        scene_id,
        shot_number,
        description,
        generated_image_url,
        status,
        shot_type,
        mood,
        action_beat,
        prompt,
        negative_prompt,
        seed,
        ai_model,
        aspect_ratio,
        focal_length,
        camera_angle,
        camera_movement,
        lighting_style,
        created_at
      FROM shots
      ORDER BY shot_number
    `,
    format: "JSONEachRow",
  });

  return await result.json();
}