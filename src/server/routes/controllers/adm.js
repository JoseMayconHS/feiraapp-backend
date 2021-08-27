const bcryptjs = require("bcryptjs"),
  { ObjectId } = require('mongodb'),
  functions = require("../../../functions"),
  limit = +process.env.LIMIT_PAGINATION || 10


exports.index = async (req, res) => {
  // OK

  try {

    const { nome = '' } = req.query

    let { page = 1, nivel = 0 } = req.query

    page = +page
    nivel = +nivel

    const where = {}

    if (nivel) {
      where.level = nivel
    }
    
    if (nome.length) {

      const isEmail = nome.includes('@')

      const name_regex = new RegExp(nome.trim())

      where[isEmail ? 'email' : 'username_key'] = {
        $regex: name_regex, $options: 'gi'
      }
    }

    const options = [{
      $match: where
    }, {
      $sort: {
        created_at: -1
      }
    }]

    const optionsPaginated = [{
      $skip: (limit * page) - limit
    }, {
      $limit: limit 
    }]

    const optionsCounted = [{
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }, {
      $project: {
        _id: 0,
        count: 1
      }
    }]

    const [{ documents, postsCounted }] = await req.db.adm.aggregate([{
      $facet: {
        documents: [
          ...options,
          ...optionsPaginated
        ],
        postsCounted: [
          ...options,
          ...optionsCounted
        ]   
      }
    }]).toArray()
    
    let count = 0

    if (postsCounted.length) {
      count = postsCounted[0].count
    }

    res.status(200).json({ ok: true, data: documents, limit, count, page })

  } catch(e) {
    res.status(500).send()
  }
}

exports.remove = async (req, res) => {
  // OK

  try {
    const { id } = req.params

    await req.db.adm.deleteOne({ _id: new ObjectId(id) })

    res.status(200).send()
    
  } catch (err) {
    res.status(500).send(err);
  }
};

exports.qtd = async (req, res) => {
  try {

    const already = await req.db.adm.count()

    res.status(200).json({ already: !!already });

  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
}

exports.store = async (req, res) => {
  // OK

  try {
    const { username, autoLogin, email } = req.body;
    let { password } = req.body;

    password = functions.criptor(password.trim().toLowerCase())

    const data = {
      username, username_key: functions.keyWord(username), email,
      password
    }

    try {
      
      const { insertedId } = await req.db.adm.insertOne({ ...data, created_at: Date.now() })

      // const document = await req.db.adm.findOne({ _id: insertedId }, { projection: { password: 0 } })
      const document = {
        _id: insertedId,
        ...data,
        password: undefined
      }

      if (autoLogin) {

        const token = await functions.token({ _id: document._id, adm: true, level: document.level })
        
        res.status(201)
          .json({
            ok: true,
            data: {
              ...document,
              token
            },
          });

      } else {
        res.status(201)
          .json({
            ok: true,
            data: { ...document },
          });
      }
    } catch(e) {
      console.log(e)
      res.status(200).json({ ok: false, message: "Não criado" });
    }

  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params

    if (req.body.password && req.body.password.length) {
      req.body.password = functions.criptor(req.body.password.trim().toLowerCase());
    } else {
      delete req.body.password
    }

    delete req.body._id

    req.body.username_key = functions.keyWord(req.body.username)

    await req.db.adm.updateOne({ _id: new ObjectId(id) }, { $set: req.body })

    res.status(200).json({ ok: true })
  } catch(e) {
    console.log(e)
    res.status(500).send()
  }
}

exports.sign = async (req, res) => {
  // OK

  try {
    const { username, password, level } = req.body


    const adm = await req.db.adm.findOne({ username_key: functions.keyWord(username) })

    try {
      if (!adm) {
        throw "Usuário não existe";
        // throw "Email não existe 🙄";
      }

      if (
        !bcryptjs.compareSync(password.trim().toLowerCase(), adm.password)
      ) {
        throw "Senha inválida";
        // throw "Senha inválida 🙄";
      }

      const token = await functions
        .token({ adm: true, _id: adm._id, level: adm.level })

        res.status(200)
          .json({
            ok: true,
            data: {
              ...adm,
              password: undefined,
              token
            },
          });

    } catch (message) {
      res.status(200).json({ ok: false, message: typeof message === 'string' ? message : 'Ocorreu um erro!' });
    }

  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
};

exports.reconnect = async (req, res) => {
  // OK

  try {

    if (!req.payload) throw new Error();

    const where = { _id: new ObjectId(req.payload._id) }
    
    const adm = await req.db.adm.findOne(where, { projection: { password: 0 } })
    
    if (adm) {

      const token = await functions
        .token({ adm: true, _id: adm._id })
      
        res
          .status(200)
          .json({
            ok: true,
            data: {
              ...adm,
              token
            },
          })

    } else {
      res.status(200).json({
        ok: false,
        message: 'A sua conta não existe!'
      })
    }

  } catch (err) {
    console.log(err)
    res.status(500).send(err);
  }
};
