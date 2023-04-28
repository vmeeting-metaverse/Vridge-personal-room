import mongoose from 'mongoose';

export const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ['ko', 'en'],
      required: true,
    },
    avatarSrc: {
      type: String,
      required: false,
    },
    username: {
      type: String,
      required: true,
    },
    vmeetingId: {
      type: String,
      required: true,
      unique: true,
    },
    // * 말풍선 보이는지 여부
    speechBubbleYN: {
      type: Boolean,
      required: true,
      default: false,
    },
    useYN: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: true },
);

export const spaceSchema = new mongoose.Schema(
  {
    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SpaceType',
      required: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
    },
    isPersonal: {
      type: Boolean,
      required: true,
      default: false,
    },
    privateYN: {
      type: Boolean,
      required: true,
      default: false,
    },
    password: {
      type: String,
    },
    lobbyYN: {
      type: Boolean,
      required: true,
      default: false,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    inviteLink: {
      type: String,
      required: false,
    },
    mediaBoardNetId: {
      type: String,
      required: false,
    },
    notice: {
      type: String,
      required: false,
    },
    openMediaBoardYN: {
      type: Boolean,
      required: true,
      default: false,
    },
    openPlatformYN: {
      type: Boolean,
      required: true,
      default: false,
    },
    onlyPresenterModeYN: {
      type: Boolean,
      required: true,
      default: false,
    },
    useYN: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: true },
);

export const spaceTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      unique: true,
      required: true,
    },
    i18nkey: {
      type: String,
      required: true,
    },
    maxUserCapacity: {
      type: Number,
      required: true,
    },
    mediaBoardYN: {
      type: Boolean,
      required: true,
      default: false,
    },
    platformYN: {
      type: Boolean,
      required: true,
      default: false,
    },
    useYN: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: true },
);

export const participateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    spaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Space',
      required: true,
    },
    status: {
      type: String,
      enum: ['REJECTED', 'ACCEPTED', 'WAITING', 'CANCELED'],
      required: true,
    },
    useYN: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  { _id: true },
);

export const chatSchema = new mongoose.Schema(
  {
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderName: {
      type: String,
      required: true,
    },
    targetType: {
      type: String,
      enum: ['space', 'user', 'lobby'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      // TODO: multiple ref test
      required: false,
    },
    contentsType: {
      type: String,
      enum: ['image', 'text'],
      required: true,
    },
    contents: {
      type: String,
      required: true,
    },
  },
  { _id: true, timestamps: { createdAt: true } },
);

chatSchema.virtual('ChatToSpace', {
  ref: 'Space',
  localField: 'targetId',
  foreignField: '_id',
  justOne: true,
});

chatSchema.virtual('ChatToUser', {
  ref: 'User',
  localField: 'targetId',
  foreignField: '_id',
  justOne: true,
});

export const User = mongoose.model('User', userSchema);
export const Space = mongoose.model('Space', spaceSchema);
export const SpaceType = mongoose.model('SpaceType', spaceTypeSchema);
export const Participate = mongoose.model('Participate', participateSchema);
export const Chat = mongoose.model('Chat', chatSchema);

export const connect = async (dbname?: string) => {
  try {
    const mongo = await mongoose.connect(`mongodb://backend-db:${process.env.MONGO_PORT}`, {
      user: process.env.MONGO_INITDB_ROOT_USERNAME,
      pass: process.env.MONGO_INITDB_ROOT_PASSWORD,
      dbName: dbname || process.env.MONGO_INITDB_DATABASE,
    });

    // TODO: change this logic to other system.
    if ((await SpaceType.find({})).length < 4) {
      await SpaceType.create({
        name: 'conference',
        i18nkey: 'space.spaceList.conference',
        maxUserCapacity: 200,
        mediaBoardYN: true,
        platformYN: true,
      });
      await SpaceType.create({
        name: 'auditorium',
        i18nkey: 'space.spaceList.auditorium',
        maxUserCapacity: 200,
        mediaBoardYN: true,
        platformYN: true,
        useYN: false,
      });
      await SpaceType.create({
        name: 'lectureRoomA',
        i18nkey: 'space.spaceList.lectureRoomA',
        maxUserCapacity: 72,
        mediaBoardYN: true,
        platformYN: true,
      });
      await SpaceType.create({
        name: 'lectureRoomB',
        i18nkey: 'space.spaceList.lectureRoomB',
        maxUserCapacity: 30,
        mediaBoardYN: true,
        platformYN: true,
        useYN: false,
      });
    }

    console.log('connection success');
    return mongo;
  } catch (e) {
    console.log(e);
  }
};
