import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";
import healthRouter from "./health";
import authRouter from "./auth";
import participantsRouter from "./participants";
import enseignantsRouter from "./enseignants";
import etablissementsRouter from "./etablissements";
import affectationsRouter from "./affectations";
import presencesRouter from "./presences";
import imcRouter from "./imc";
import fichesRouter from "./fiches";
import statsRouter from "./stats";
import referentielsRouter from "./referentiels";
import usersRouter from "./users";
import auditLogRouter from "./auditLog";
import tuteursRouter from "./tuteurs";
import santeRouter from "./sante";
import scolariteRouter from "./scolarite";
import spirituelRouter from "./spirituel";
import financesRouter from "./finances";
import documentsRouter from "./documents";
import notificationsRouter from "./notifications";
import exportRouter from "./export";
import importExcelRouter from "./importExcel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);

router.use(requireAuth);

router.use(participantsRouter);
router.use(enseignantsRouter);
router.use(etablissementsRouter);
router.use(affectationsRouter);
router.use(presencesRouter);
router.use(imcRouter);
router.use(fichesRouter);
router.use(statsRouter);
router.use(referentielsRouter);
router.use(usersRouter);
router.use(auditLogRouter);
router.use(tuteursRouter);
router.use(santeRouter);
router.use(scolariteRouter);
router.use(spirituelRouter);
router.use(financesRouter);
router.use(documentsRouter);
router.use(notificationsRouter);
router.use(exportRouter);
router.use(importExcelRouter);

export default router;
